import { Module } from '@nestjs/common';
import { ChessEngineService } from './chess-engine.service';
import { PgnParserService } from './pgn-parser.service';
import { PgnFormatterService } from './pgn-formatter.service';

@Module({
  providers: [ChessEngineService, PgnParserService, PgnFormatterService],
  exports: [ChessEngineService, PgnParserService, PgnFormatterService],
})
export class ChessModule {}
