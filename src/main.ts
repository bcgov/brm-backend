import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig } from './winston-config.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  // Setup app with logging
  const logger = winston.createLogger(winstonConfig);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      instance: logger, // Pass the custom Winston instance
    }),
  });
  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URI,
  });
  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('BRM App API')
    .setDescription('The BRM App API provides endpoints for managing rules and decisions.')
    .setVersion('1.0')
    .addTag('nest')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      // Display only GET and HEAD endpoints for 'Try it Out' function in Swagger UI until additional security is implemented
      supportedSubmitMethods: [
        'get',
        'head',
        // 'post', 'put', 'patch', 'delete'
      ],
    },
  });
  // Start the app on the specified port
  const port = process.env.PORT || 3000;
  await app.listen(process.env.PORT || 3000);
  logger.info(`Server is running on port ${port} with ${process.env.FRONTEND_URI} allowed origins.`);
}
bootstrap();
