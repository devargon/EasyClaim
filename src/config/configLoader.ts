const env: string = process.env.NODE_ENV || 'development';

import developmentConfig from './config.development';
import productionConfig from './config.production';

const [config_type, config] = process.env.NODE_ENV === 'production' ? ['Production', productionConfig] : ['Development', developmentConfig];

console.log(`Loading ${config_type} config...`);
export default config;
