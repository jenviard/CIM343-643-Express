const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const storage = path.join(__dirname, '..', 'data', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

const CardAccount = require('./cardAccount')(sequelize, DataTypes);
const ReceiptItem = require('./receiptItem')(sequelize, DataTypes);
const Payment = require('./payment')(sequelize, DataTypes);

Payment.belongsTo(CardAccount);
CardAccount.hasMany(Payment);

module.exports = {
  sequelize,
  Sequelize,
  CardAccount,
  ReceiptItem,
  Payment
};
