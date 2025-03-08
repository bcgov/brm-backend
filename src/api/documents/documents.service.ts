import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { readFileSafely, FileNotFoundError } from '../../utils/readFile';

@Injectable()
export class DocumentsService {
  baseRulesDirectory: string;

  constructor(private configService: ConfigService) {
    this.baseRulesDirectory = this.configService.get<string>('RULES_DIRECTORY');
  }

  // Go through the rules directory and return a list of all JSON files
  async getAllJSONFiles(ruleDir: string = ''): Promise<string[]> {
    const jsonFiles: string[] = [];
    const directory = path.join(this.baseRulesDirectory, ruleDir);

    async function readDirectory(dir: string, baseDir: string) {
      const files = await fsPromises.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(baseDir, fullPath);
        if (file.isDirectory()) {
          await readDirectory(fullPath, baseDir); // Recurse into subdirectory
        } else if (path.extname(file.name).toLowerCase() === '.json') {
          jsonFiles.push(relativePath);
        }
      }
    }

    try {
      await readDirectory(directory, directory);
      return jsonFiles;
    } catch (err) {
      throw new HttpException('Error reading directory', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Get the content of a specific JSON file
  async getFileContent(ruleFileName: string): Promise<Buffer> {
    try {
      return await readFileSafely(this.baseRulesDirectory, ruleFileName);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
