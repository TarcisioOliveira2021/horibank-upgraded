import { Injectable } from '@nestjs/common';
import { PessoaDTO } from './pessoa_dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PessoaService {
    constructor(private prismaService: PrismaService) {}

    cadastrarPessoa(pessoa: PessoaDTO){
        this.convertDataNascimento(pessoa);
        //TODO: Implementar encriptar senha
        return this.prismaService.pessoa.create({data: pessoa});
    }

    convertDataNascimento(pessoa: PessoaDTO){
        const dataNascimento = new Date(pessoa.dataNascimento).toISOString();
        pessoa.dataNascimento = dataNascimento.toString();
    }
}
