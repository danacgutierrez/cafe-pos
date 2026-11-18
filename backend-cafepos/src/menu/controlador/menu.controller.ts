import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { Publico } from '../../auth/decoradores/publico.decorator';
import { Roles } from '../../auth/decoradores/roles.decorator';
import { Rol } from '../../auth/dominio/usuario';
import {
    CreateBeverageDto,
    CreateDrinkTypeDto,
    CreateFlavorDto,
    CreateOptionDto,
    QuoteDto,
    SaveRecipeDto,
    SetActiveDto,
    UpdatePriceDto,
} from '../dto/menu.dto';
import { MenuService } from '../servicio/menu.service';

@Controller('menu')
export class MenuController {
    constructor(private readonly service: MenuService) {}

    @Publico()
    @Get()
    listCatalog() {
        return this.service.listCatalog();
    }

    @Publico()
    @Post('quote')
    @HttpCode(200) // es un cálculo, no crea un recurso
    quote(@Body() dto: QuoteDto) {
        return this.service.quote(dto);
    }

    @Roles(Rol.admin)
    @Post('types')
    createType(@Body() dto: CreateDrinkTypeDto) {
        return this.service.createDrinkType(dto);
    }

    @Roles(Rol.admin)
    @Patch('types/:id/active')
    setTypeActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
        return this.service.setTypeActive(id, dto);
    }

    @Roles(Rol.admin)
    @Post('flavors')
    createFlavor(@Body() dto: CreateFlavorDto) {
        return this.service.createFlavor(dto);
    }

    @Roles(Rol.admin)
    @Patch('flavors/:id/active')
    setFlavorActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
        return this.service.setFlavorActive(id, dto);
    }

    @Roles(Rol.admin)
    @Post('options')
    createOption(@Body() dto: CreateOptionDto) {
        return this.service.createOption(dto);
    }

    @Roles(Rol.admin)
    @Patch('options/:id/active')
    setOptionActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
        return this.service.setOptionActive(id, dto);
    }

    @Roles(Rol.admin)
    @Post('beverages')
    createBeverage(@Body() dto: CreateBeverageDto) {
        return this.service.createBeverage(dto);
    }

    @Roles(Rol.admin)
    @Patch('beverages/:id/active')
    setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto) {
        return this.service.setBeverageActive(id, dto);
    }

    @Roles(Rol.admin)
    @Patch('beverages/:id/price')
    updatePrice(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePriceDto) {
        return this.service.updateBeveragePrice(id, dto);
    }

    @Roles(Rol.admin)
    @Put('beverages/:idBeverage/recipe')
    saveRecipe(
        @Param('idBeverage', ParseIntPipe) idBeverage: number,
        @Body() dto: SaveRecipeDto,
    ) {
        return this.service.saveRecipe(idBeverage, dto);
    }
}
