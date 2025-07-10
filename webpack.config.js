import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: {
    content: './src/content.js',
    background: './src/background.js',
    popup: './src/popup.js',
    options: './src/options.js'
  },
  output: {
    path: path.resolve(__dirname, 'WebExtension/dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env'] }
        }
      }
    ]
  }
  // mode is set via CLI: --mode development or --mode production
};
