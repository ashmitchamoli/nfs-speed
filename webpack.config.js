const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist/'),
    publicPath: 'dist/',
  },
  devtool:'source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
  },
  experiments: {
    topLevelAwait: true
  },
};
