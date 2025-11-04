const path = require('path');
const { Sequelize } = require('sequelize');

const storage = path.join(__dirname, '..', 'data', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

// import models
const Task = require('./task')(sequelize);

module.exports = {
  sequelize,
  Task
};
