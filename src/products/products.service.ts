import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient, Product } from "@prisma/client";
import { RpcException } from "@nestjs/microservices";

import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PaginationDto } from "../common";

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger("ProductsService");

  onModuleInit() {
    this.$connect();
    this.logger.log("Connected to the database");
  }

  create(createProductDto: CreateProductDto): Promise<Product> {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const totalRegisters = await this.product.count({
      where: { available: true },
    });
    const lastPage = Math.ceil(totalRegisters / limit);

    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true },
      }),
      meta: {
        page,
        total: totalRegisters,
        lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, available: true },
    });

    if (!product)
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;

    await this.findOne(id);

    return this.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const product = await this.product.update({
      where: { id },
      data: {
        available: false,
      },
    });

    return product;
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: ids }, available: true },
    });

    if (products.length !== ids.length)
      throw new RpcException({
        message: "Some products were not found",
        status: HttpStatus.BAD_REQUEST,
      });

    return products;
  }
}
