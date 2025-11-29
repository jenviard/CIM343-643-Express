var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs');

var app = express();

const { sequelize, CardAccount, ReceiptItem, Payment } = require('./models');

async function initDatabase() {
  await sequelize.sync();

  const cardCount = await CardAccount.count();
  if (cardCount === 0) {
    await CardAccount.bulkCreate([
      {
        cardNumber: '4111111111111111',
        expiryMonth: 12,
        expiryYear: 2027,
        cvv: '123',
        cardholderName: 'Alice Diner',
        availableBalance: 20.0
      },
      {
        cardNumber: '5555555555554444',
        expiryMonth: 11,
        expiryYear: 2026,
        cvv: '456',
        cardholderName: 'Bob Diner',
        availableBalance: 40.0
      },
      {
        cardNumber: '4000000000000002',
        expiryMonth: 10,
        expiryYear: 2028,
        cvv: '789',
        cardholderName: 'Charlie Diner',
        availableBalance: 30.0
      },
      {
        cardNumber: '378282246310005',
        expiryMonth: 9,
        expiryYear: 2027,
        cvv: '321',
        cardholderName: 'Dana Diner',
        availableBalance: 60.0
      },
      {
        cardNumber: '6011111111111117',
        expiryMonth: 8,
        expiryYear: 2029,
        cvv: '654',
        cardholderName: 'Evan Diner',
        availableBalance: 25.0
      }
    ]);
  }

  console.log('Database synced and EZPay data ensured.');
}

initDatabase().catch(err => {
  console.error('Error initializing database:', err);
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

app.get('/', function (req, res, next) {
  res.redirect('/receipt');
});

async function renderEzpayPage(res, extra) {
  extra = extra || {};

  const items = await ReceiptItem.findAll();
  const total = items.reduce((sum, item) => sum + item.price, 0);

  const paymentsTotalRaw = await Payment.sum('amount');
  const paymentsTotal = paymentsTotalRaw || 0;

  const remainingRaw = total - paymentsTotal;
  const remaining = Number(remainingRaw.toFixed(2));
  const fullyPaid = remaining === 0;

  const payments = await Payment.findAll({
    include: CardAccount,
    order: [['createdAt', 'DESC']]
  });

  res.render('ezpay', {
    title: 'EZPay',
    items,
    total,
    paymentsTotal,
    remaining,
    payments,
    fullyPaid,
    ...extra
  });
}

app.get('/receipt', async function (req, res, next) {
  try {
    const items = await ReceiptItem.findAll();
    const total = items.reduce((sum, item) => sum + item.price, 0);

    res.render('receipt', {
      title: 'Create receipt',
      items,
      total
    });
  } catch (err) {
    next(err);
  }
});

app.post('/receipt', async function (req, res, next) {
  try {
    const name = (req.body.itemName || '').trim();
    const priceStr = (req.body.itemPrice || '').trim();
    const price = parseFloat(priceStr);

    if (name && !isNaN(price) && price > 0) {
      await ReceiptItem.create({
        description: name,
        price
      });

      await Payment.destroy({ where: {} });
    }

    res.redirect('/receipt');
  } catch (err) {
    next(err);
  }
});

app.post('/receipt/reset', async function (req, res, next) {
  try {
    await Payment.destroy({ where: {} });
    await ReceiptItem.destroy({ where: {} });
    res.redirect('/receipt');
  } catch (err) {
    next(err);
  }
});

app.get('/ezpay', async function (req, res, next) {
  try {
    await renderEzpayPage(res);
  } catch (err) {
    next(err);
  }
});

app.post('/ezpay/charge', async function (req, res, next) {
  try {
    const {
      cardNumber,
      cardholderName,
      expiryMonth,
      expiryYear,
      cvv,
      amount
    } = req.body;

    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum <= 0) {
      return await renderEzpayPage(res, {
        errorMessage: 'Please enter a valid positive amount.',
        form: req.body
      });
    }

    const items = await ReceiptItem.findAll();
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const paymentsTotalRaw = await Payment.sum('amount');
    const paymentsTotal = paymentsTotalRaw || 0;
    const remaining = Number((total - paymentsTotal).toFixed(2));

    if (amountNum > remaining) {
      return await renderEzpayPage(res, {
        errorMessage: `You tried to pay $${amountNum.toFixed(
          2
        )}, but only $${remaining.toFixed(2)} is left on the check.`,
        form: req.body
      });
    }

    const card = await CardAccount.findOne({
      where: {
        cardNumber,
        cardholderName,
        expiryMonth: parseInt(expiryMonth, 10),
        expiryYear: parseInt(expiryYear, 10),
        cvv
      }
    });

    if (!card) {
      return await renderEzpayPage(res, {
        errorMessage:
          'Card details not found. Please double-check the number, expiration, CVV, and name.',
        form: req.body
      });
    }

    if (amountNum > card.availableBalance) {
      return await renderEzpayPage(res, {
        errorMessage: `Insufficient funds. This card only has $${card.availableBalance.toFixed(
          2
        )} available.`,
        form: req.body
      });
    }

    await Payment.create({
      amount: amountNum,
      CardAccountId: card.id
    });

    card.availableBalance = card.availableBalance - amountNum;
    await card.save();

    const newPaymentsTotalRaw = await Payment.sum('amount');
    const newPaymentsTotal = newPaymentsTotalRaw || 0;
    const newRemaining = Number((total - newPaymentsTotal).toFixed(2));

    const successMessage =
      newRemaining === 0
        ? 'Payment accepted! The entire check is now fully covered. Behind the scenes, EZPay would now aggregate these charges onto a single “tap-to-pay” card.'
        : 'Payment accepted!';

    await renderEzpayPage(res, {
      successMessage
    });
  } catch (err) {
    next(err);
  }
});

app.get('/ezpay/ready', async function (req, res, next) {
  try {
    const items = await ReceiptItem.findAll();
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const paymentsTotalRaw = await Payment.sum('amount');
    const paymentsTotal = paymentsTotalRaw || 0;

    if (paymentsTotal < total) {
      return res.redirect('/ezpay');
    }

    res.render('ezpay_ready', {
      title: 'EZPay',
      amount: total.toFixed(2)
    });
  } catch (err) {
    next(err);
  }
});

app.post('/ezpay/reset', async function (req, res, next) {
  try {
    await Payment.destroy({ where: {} });
    await CardAccount.destroy({ where: {} });
    await initDatabase();
    res.redirect('/ezpay');
  } catch (err) {
    next(err);
  }
});

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
