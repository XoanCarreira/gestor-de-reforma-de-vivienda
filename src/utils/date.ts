

{/** Exportar funcións para manexo de datas */}
export const utils = {
  getToday: () => {
    return new Date().toISOString().split('T')[0];
  }
};