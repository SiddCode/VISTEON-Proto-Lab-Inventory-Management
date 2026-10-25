const PREDEFINED_PROGRAMS = [
  'Renault Nissan',
  'Mahindra',
  'Skoda',
  'Tata',
  'TVS',
  'Royal Enfield',
  'Honda',
  'Maruti Suzuki',
  'PSA'
];

const USER_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

const TRANSACTION_TYPES = {
  INWARD: 'INWARD',
  OUTWARD: 'OUTWARD'
};

const TRACKING_MODES = {
  QUANTITY: 'QUANTITY',
  SERIALIZED: 'SERIALIZED'
};

module.exports = {
  PREDEFINED_PROGRAMS,
  USER_ROLES,
  TRANSACTION_TYPES,
  TRACKING_MODES
};
