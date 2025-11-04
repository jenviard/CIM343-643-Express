module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const Task = sequelize.define('Task', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT }
  });

  return Task;
};
