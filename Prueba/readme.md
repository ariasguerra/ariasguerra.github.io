# Contactos Policiales

Una aplicación web para la gestión de contactos de la Policía Nacional de Colombia, especialmente diseñada para uso interno en la Estación de Policía Barrios Unidos.

## Características

- **Carga de contactos**: Importación de archivos JSON con información de contactos
- **Búsqueda avanzada**: Búsqueda por texto y búsqueda por voz
- **Gestión completa**: Ver, llamar, enviar WhatsApp, enviar correo y compartir contactos
- **Exportación**: Generación de vCards para añadir contactos a la agenda telefónica
- **Resumen de personal**: Estadísticas detalladas del personal por rangos

## Estructura del Proyecto

```
contactos-policiales/
│
├── index.html                # Página principal
├── manifest.json             # Configuración para PWA (opcional)
├── favicon.ico               # Ícono de la aplicación
│
├── assets/                   # Recursos estáticos
│   ├── css/
│   │   └── styles.css        # Estilos de la aplicación
│   └── icons/
│       └── ...               # Iconos de la aplicación (opcional)
│
├── js/                       # Scripts de JavaScript
│   ├── app.js                # Punto de entrada principal
│   │
│   ├── controllers/          # Controladores
│   │   └── appController.js  # Controlador principal
│   │
│   ├── models/               # Modelos de datos
│   │   └── contactModel.js   # Modelo de contactos
│   │
│   ├── views/                # Componentes de vista
│   │   ├── uiController.js   # Controlador de interfaz
│   │   └── personalSummary.js # Resumen de personal
│   │
│   └── utils/                # Utilidades
│       └── contactUtils.js   # Funciones de utilidad
│
└── README.md                 # Documentación
```

## Instalación y Uso

1. Clona este repositorio:
   ```
   git clone https://github.com/tu-usuario/contactos-policiales.git
   ```

2. Abre el archivo `index.html` en tu navegador web o configura un servidor web local.

3. Para cargar contactos, prepara un archivo JSON con la siguiente estructura:
   ```json
   [
     {
       "GR": "CT",
       "NOMBRES": "JUAN CARLOS",
       "APELLIDOS": "PÉREZ GÓMEZ",
       "CC": "79123456",
       "PLACA": "12345",
       "CARGO": "Comandante de Estación",
       "CELULAR": "3001234567",
       "CORREO ELECTRÓNICO": "juan.perez@policia.gov.co"
     },
     ...
   ]
   ```

4. Haz clic en "Cargar archivo JSON" y selecciona tu archivo preparado.

## Funcionalidades Detalladas

### Búsqueda de Contactos
- Búsqueda por texto: nombres, apellidos, cargo, cédula, placa, teléfono
- Búsqueda por voz: utiliza el micrófono para buscar contactos

### Acciones Disponibles
- **Llamar**: Inicia una llamada al número del contacto
- **WhatsApp**: Abre WhatsApp con un mensaje predefinido
- **Email**: Crea un correo con formato institucional
- **Compartir**: Comparte la información del contacto
- **Añadir a Contactos**: Genera una vCard para añadir a la agenda

### Parte del Personal
Muestra estadísticas de distribución del personal por categorías:
- Oficiales
- Suboficiales
- Patrulleros
- Patrulleros de Policía
- Auxiliares de Policía
- Personal Civil

## Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Patrón de diseño Módulo
- Arquitectura MVC

## Compatibilidad

La aplicación es compatible con navegadores modernos:
- Chrome (recomendado)
- Firefox
- Safari
- Edge

## Licencia

Este proyecto es para uso interno de la Policía Nacional de Colombia.
