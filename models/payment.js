module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Payment = sequelize.define('Payment', {
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  });

  return Payment;
};
