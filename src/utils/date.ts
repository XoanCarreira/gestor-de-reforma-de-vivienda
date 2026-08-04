

{/** Exportar funcións para manexo de datos */}
export const utils = {
  getToday: () => {
    return new Date().toISOString().split('T')[0];
  }
};