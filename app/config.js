// Configuración pública de la interfaz. No poner credenciales aquí.
window.AVIAN_CONFIG = {
  cameraLabel: 'Exterior CAM142 Cordoba - Argentina',
  description: 'Una composición viva a partir de sonidos que escuchan dispositivos de seguridad',
  apiPrefix: '/birdnet',
  recentWindowMinutes: 30,
  refreshMinutes: 5,
  argentinaNamesUrl: '/runtime/argentina-names.json',
  // Se puede ampliar o corregir sin modificar el clasificador.
  commonNameTranslations: {
    "Eurasian Coot": "Focha común",
    "Steller's Sea-Eagle": "Pigargo de Steller",
    "Tundra Swan": "Cisne de tundra",
    "Inca Dove": "Tortolita inca",
    "Yellow-billed Cuckoo": "Cuco de pico amarillo",
    "Northern Saw-whet Owl": "Mochuelo norteño",
    "Swainson's Flycatcher": "Burlisto pico canela",
    "Green-barred Woodpecker": "Carpintero real",
  },
};
