
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const CardAccount = sequelize.define('CardAccount', {
    cardNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expiryMonth: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    expiryYear: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cvv: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cardholderName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    availableBalance: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  });

  return CardAccount;
};
