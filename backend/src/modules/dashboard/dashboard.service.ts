import * as repo from './dashboard.repository.js';

export async function getTvFabricaData() {
  return repo.getTvFabricaData();
}

export async function getGerencialData(periodo?: string, mes?: number, ano?: number) {
  return repo.getGerencialData(periodo, mes, ano);
}

export async function getFechamentoMensal(mes?: number, ano?: number) {
  return repo.getFechamentoMensal(mes, ano);
}

export async function getMesesDisponiveis() {
  return repo.getMesesDisponiveis();
}

