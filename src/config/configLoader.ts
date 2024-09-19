import path from 'path';

const env: string = process.env.NODE_ENV || 'development';

// Construct the path to the config file based on the environment
const configPath: string = path.resolve(__dirname, `./config.${env}.js`);

console.log(`Loading config from: ${configPath}`);

let config: any;

try {
    // Dynamically import the configuration file
    config = require(configPath);
} catch (error) {
    console.error(`Failed to load config for environment: ${env}`);
    console.error(`Attempted path: ${configPath}`);
    console.error(error);
    process.exit(1);
}

// Export the configuration as the default export
export default config;
