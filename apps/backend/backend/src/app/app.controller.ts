import { Controller, Get, Header, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { AppService } from './app.service';
import { TreesService } from './trees/trees.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly treesService: TreesService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('badge/:handle')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getBadge(
    @Param('handle') handle: string,
    @Query('theme') theme: string,
    @Res() res: Response,
  ) {
    const data = await this.treesService.getBadgeData(handle);
    if (!data) throw new NotFoundException('Profile not found');
    const t = theme === 'light' ? 'light' : 'dark';
    const svg = this.treesService.buildSkillCardSvg(data.displayHandle, data.skills, data.totalCount, data.repoCount, t);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  }
}
