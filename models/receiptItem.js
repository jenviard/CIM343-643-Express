module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const ReceiptItem = sequelize.define('ReceiptItem', {
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  });

  return ReceiptItem;
};
