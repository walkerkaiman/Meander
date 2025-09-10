import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from config.env
dotenv.config({ path: './config.env' });

// Configuration schema
const configSchema = z.object({
  // Wi-Fi network configuration
  WIFI_NETWORK_NAME: z.string().default("Beachcat"),
  WIFI_PASSWORD: z.string().default("1234567890"),

  // Server configuration
  SERVER_PORT: z.string().default("4000"),
  OSC_PORT: z.string().default("57121"),
  DATA_DIR: z.string().default(`${require("os").homedir()}/.meander`),
  LOG_LEVEL: z.string().default("info"),
});

// Parse and validate configuration
export const config = configSchema.parse(process.env);

// Export individual config values for convenience
export const {
  WIFI_NETWORK_NAME,
  WIFI_PASSWORD,
  SERVER_PORT,
  OSC_PORT,
  DATA_DIR,
  LOG_LEVEL,
} = config;
