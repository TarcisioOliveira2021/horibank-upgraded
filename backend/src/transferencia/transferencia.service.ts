import { Injectable, InternalServerErrorException, NotFoundException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';
import { ContaService } from '../conta/conta.service';
import { TransacaoService } from '../transacao/transacao.service';
import { TransferenciaDTO } from '../transferencia/transferencia_dto';
import { Conta } from '@prisma/client';

@Injectable()
export class TransferenciaService {

    constructor(
        private readonly prismaService: PrismaService,
        private readonly contaService: ContaService,
        private readonly transacaoService: TransacaoService
    ) { }

    async transferir(idContaOrigem: number, idContaDestino: number, valor: number) {
        this.contaService.verificarValorNegativoZero(valor);

        let contaOrigem = await this.prismaService.conta.findUnique({
            where: {
                id: +idContaOrigem
            }
        });

        let contaDestino = await this.prismaService.conta.findUnique({
            where: {
                id: +idContaDestino
            }
        });

        this.validarTransferencia(contaOrigem, contaDestino, valor);
        contaOrigem.saldo = new Decimal(contaOrigem.saldo).minus(valor);
        contaDestino.saldo = new Decimal(contaDestino.saldo).plus(valor);

        await this.contaService.atualizarSaldoConta(+idContaOrigem, contaOrigem.saldo);
        await this.contaService.atualizarSaldoConta(+idContaDestino, contaDestino.saldo);
        await this.prismaService.transferencia.create({
            data: {
                valor: valor,
                contaOrigem: { connect: { id: +idContaOrigem } },
                contaDestino: { connect: { id: +idContaDestino } },
                data: new Date().toISOString()
            }
        });

        await this.transacaoService.criarTransacao({
            idConta: +idContaOrigem,
            valor: valor,
            data: new Date(),
            tipo: 'TRANSFERENCIA'
        });
    }

    private validarTransferencia(contaOrigem: Conta, contaDestino: Conta, valor: number) {
        if (!contaOrigem || !contaDestino) {
            throw new Error('Revise os dados das contas fornecidos');
        }
        if (new Decimal(contaOrigem.saldo).toNumber() < valor) {
            throw new Error('Saldo da conta insuficiente para fazer a transferência');
        }
    }

    public async buscarTransferencias(idConta: number) {
        const transferenciasDTO: TransferenciaDTO[] = [];
        let transferencias = await this.prismaService.transferencia.findMany({
            where: {
                idContaOrigem: idConta
            },
            include: {
                contaDestino: {
                    include: {
                        pessoa: true
                    }
                }
            }
        });

        if (!transferencias) {
            throw new Error('Nenhuma transferência encontrada para a conta informada');
        }

        return transferencias.forEach(transferencia => {
            transferenciasDTO.push({
                titularContaDestino: transferencia.contaDestino.pessoa.nome_completo,
                agenciaContaDestino: transferencia.contaDestino.agencia,
                numero_digitoContaDestino: transferencia.contaDestino.numero + '-' + transferencia.contaDestino.digito,
                tipoContaDestino: transferencia.contaDestino.tipoConta,
                valor: 'R$'+transferencia.valor.toFixed(2),
                data: transferencia.data.getDate().toString() + '/' + (transferencia.data.getMonth() + 1).toString() + '/' + transferencia.data.getFullYear().toString()
            });
        });
    }
}
