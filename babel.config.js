module.exports = function(api) {
  const isTest = api.env('test');

  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ]
    };
  }

  return {
    presets: ['babel-preset-expo']
  };
};

