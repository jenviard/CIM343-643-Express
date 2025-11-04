var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var hbs = require('hbs');//added

var app = express();

// Sequelize (sqlite) - define model inline so no external models/ files are required
const { Sequelize, DataTypes } = require('sequelize');
const storage = require('path').join(__dirname, 'data', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

// Task model
const Task = sequelize.define('Task', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT }
});

// ensure database tables exist; don't block export - log result
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Unable to sync database:', err);
});

// view engine setup

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Setting up your routes
//var indexRouter = require('./routes/index');
//var usersRouter = require('./routes/users');
//var parametersRouter = require('./routes/parameters');

//app.use('/', indexRouter);
//app.use('/users', usersRouter);
//app.use('/parameters',parametersRouter);

//Registering Partials
hbs.registerPartials(path.join(__dirname, 'views', 'partials'))
hbs.registerPartial('partial_name', 'partial value');

/* GET home page. */
app.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET page2 */
app.get('/page2', function(req, res, next) {
  res.render('page2', { title: 'Page2' });
});

/* GET home page. */
app.get('/parameters/:name', function(req, res) {
  //res.render('page2', { title: 'Page2' });
  // access the route parameter named `name` via `req.params.name`
 // res.send('user ' + req.params.name);
res.render('index', { title: req.params.name });
});

/* GET add task form */
app.get('/addtask', function(req, res, next) {
  res.render('addtask', { title: 'Add Task' });
});

/* POST create task */
app.post('/addtask', async function(req, res, next) {
  try {
    const created = await Task.create({ name: req.body.name, description: req.body.description });
    // render a clearer confirmation page for the saved task
    res.render('task_submitted', { title: 'Task Saved', task: created });
  } catch (err) {
    next(err);
  }
});



/* GET tasks list (JSON) */
app.get('/tasks', async function(req, res, next) {
  try {
    const tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/* GET tasks page (HTML) */
app.get('/taskspage', async function(req, res, next) {
  try {
    const tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
    // render an HTML page with the tasks
    res.render('taskspage', { title: 'Tasks', tasks });
  } catch (err) {
    next(err);
  }
});

/* POST delete a task */
app.post('/tasks/:id/delete', async function(req, res, next) {
  try {
    const id = req.params.id;
    await Task.destroy({ where: { id } });
    // redirect back to the tasks page
    res.redirect('/taskspage');
  } catch (err) {
    next(err);
  }
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
