import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const mockApp = {
  enableCors: jest.fn(),
  listen: jest.fn(),
  getHttpAdapter: jest.fn().mockReturnValue({
    getInstance: jest.fn(),
  }),
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockImplementation(() => Promise.resolve(mockApp)),
  },
}));

jest.mock('nest-winston', () => ({
  WinstonModule: {
    createLogger: jest.fn(),
  },
}));

jest.mock('@nestjs/swagger', () => {
  const originalModule = jest.requireActual('@nestjs/swagger');
  return {
    ...originalModule,
    SwaggerModule: {
      createDocument: jest.fn(),
      setup: jest.fn(),
    },
    ApiBearerAuth: jest.fn(() => () => {}),
    ApiTags: jest.fn(() => () => {}),
    ApiOperation: jest.fn(() => () => {}),
    ApiResponse: jest.fn(() => () => {}),
    DocumentBuilder: jest.fn(() => ({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addTag: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  };
});

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should bootstrap the application', async () => {
    await require('./main');

    expect(NestFactory.create).toHaveBeenCalledWith(
      AppModule,
      expect.objectContaining({
        logger: undefined,
      }),
    );

    expect(mockApp.enableCors).toHaveBeenCalledWith({
      origin: process.env.FRONTEND_URI,
    });

    expect(mockApp.listen).toHaveBeenCalledWith(process.env.PORT || 3000);
  });
});
