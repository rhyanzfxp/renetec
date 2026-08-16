import * as repo from './dashboard.repository.js';

export async function getTvFabricaData() {
  return repo.getTvFabricaData();
}

export async function getGerencialData(periodo?: string) {
  return repo.getGerencialData(periodo);
}
