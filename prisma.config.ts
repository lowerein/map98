import "dotenv/config";
import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // 直接讀取你 .env 入面嘅 DATABASE_URL
    url: process.env.DATABASE_URL, 
  },
});