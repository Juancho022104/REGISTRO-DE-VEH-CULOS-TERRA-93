/******************************************************
 * FORMULARIO DE REGISTRO Y AUTORIZACIÓN DE VEHÍCULOS
 * ELÉCTRICOS Y PUNTOS DE CARGA
 * EDIFICIO TERRA 93 PH
 *
 * ARCHIVO: Code.gs
 * Proyecto independiente del sistema de control de cargadores.
 * Guarda los datos en la hoja "Registro_Vehiculos_Cargadores" de su
 * propio Google Sheets, y los anexos en Google Drive organizados
 * en una carpeta por apartamento.
 ******************************************************/

//======================================================
// CONFIGURACIÓN GENERAL
//======================================================

const ID_HOJA_CALCULO = "1bV3jXER5B6HTHEgm4J-DtFo59yHZNMjFpDo0wTBUi0Q";
const ID_CARPETA_DRIVE = "1AbAdBhixLHT-ZdJr8PEbDj0R6n0GnFbg";
const NOMBRE_HOJA = "Registro_Vehiculos_Cargadores";

const ENCABEZADOS_HOJA = [
  "Fecha de Solicitud",
  "Nombres y Apellidos / Razón Social",
  "Cédula / NIT",
  "Apartamento",
  "Teléfono",
  "Correo Electrónico",
  "Calidad",
  "Número de Parqueadero",
  "Ubicación / Sótano / Nivel",
  "Tipo de Vehículo",
  "Marca y Línea",
  "Placa",
  "Color",
  "Capacidad de Batería (kWh)",
  "Potencia de Carga Máxima (kW)",
  "Tipo de Conector",
  "Anexo - Tarjeta de Propiedad (URL)",
  "Anexo - SOAT (URL)",
  "Anexo - Tecnomecánica (URL)",
  "Anexo - Certificación Eléctrica / Ficha Cargador (URL)",
  "Anexo - Certificación RETIE del Cargador (URL)",
  "Anexo - Carta Autorización Propietario (URL)",
  "Anexo - Compromiso Reglamento Interno (URL)",
  "Nombre Completo Firmante",
  "Cédula / NIT Firmante",
  "Firma (URL)",
  "Acepta Habeas Data",
  "Acepta Reglamento Interno"
];

//======================================================
// CARGAR SISTEMA WEB
//======================================================

function doGet() {
  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Registro y Autorización de Vehículos Eléctricos - Terra 93 PH")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

//======================================================
// INCLUIR HTML
//======================================================

function include(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
}

//======================================================
// HTML DEL FORMULARIO (servido bajo demanda vía google.script.run)
//
// La página inicial de doGet() tiene un límite de tamaño estricto en
// este modo de entrega (sandbox). Por eso el HTML del formulario NO
// va embebido en la página inicial: se pide al servidor después de
// cargar, por el canal de google.script.run, que no tiene ese límite.
//======================================================

function obtenerFormularioHTML() {
  return HtmlService.createHtmlOutputFromFile("Formulario").getContent();
}

//======================================================
// HOJA DE REGISTRO (se crea sola si no existe)
//======================================================

function obtenerHojaRegistro() {
  var libro = SpreadsheetApp.openById(ID_HOJA_CALCULO);
  var hoja = libro.getSheetByName(NOMBRE_HOJA);

  if (!hoja) {
    hoja = libro.insertSheet(NOMBRE_HOJA);
    hoja.appendRow(ENCABEZADOS_HOJA);
    hoja.setFrozenRows(1);
  }

  return hoja;
}

//======================================================
// BUSCAR VEHÍCULO YA REGISTRADO POR PLACA
//======================================================

function buscarVehiculoRegistrado(placa) {
  var hoja = obtenerHojaRegistro();
  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][11]).trim().toUpperCase() === String(placa).trim().toUpperCase()) {
      return { fila: i + 1, datos: datos[i] };
    }
  }

  return null;
}

//======================================================
// CARPETA DE DRIVE POR APARTAMENTO (se crea sola si no existe)
//======================================================

function obtenerCarpetaApto(apto) {
  var carpetaPrincipal = DriveApp.getFolderById(ID_CARPETA_DRIVE);
  var nombreCarpeta = "Apto " + apto;
  var carpetas = carpetaPrincipal.getFoldersByName(nombreCarpeta);

  return carpetas.hasNext()
    ? carpetas.next()
    : carpetaPrincipal.createFolder(nombreCarpeta);
}

//======================================================
// SUBIR ANEXO A GOOGLE DRIVE (carpeta del apartamento)
//======================================================

function subirAnexoDrive(base64, apto, placa, nombreDocumento) {
  if (!base64) {
    return "";
  }

  var partes = base64.split(",");
  var cabecera = partes[0];
  var contenido = partes[1];

  var coincidencia = cabecera.match(/data:(.*);base64/);
  var mime = coincidencia ? coincidencia[1] : "application/pdf";
  var extension = mime.split("/")[1] || "pdf";

  var carpetaApto = obtenerCarpetaApto(apto);

  var nombreArchivo = String(apto) + "_" + String(placa) + "_" + nombreDocumento + "." + extension;

  var blob = Utilities.newBlob(
    Utilities.base64Decode(contenido),
    mime,
    nombreArchivo
  );

  var archivo = carpetaApto.createFile(blob);

  archivo.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return archivo.getUrl();
}

//======================================================
// VALIDAR CORREO
//======================================================

function validarCorreo(correo) {
  if (!correo) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

//======================================================
// VALIDAR DATOS DEL FORMULARIO
//======================================================

function validarSolicitud(datos) {
  if (!datos.nombreTitular) {
    throw new Error("El nombre del titular es obligatorio.");
  }

  if (!datos.cedulaTitular) {
    throw new Error("La cédula / NIT del titular es obligatoria.");
  }

  if (!datos.apto) {
    throw new Error("El apartamento es obligatorio.");
  }

  if (!datos.telefono) {
    throw new Error("El teléfono de contacto es obligatorio.");
  }

  if (!datos.correo || !validarCorreo(datos.correo)) {
    throw new Error("Ingrese un correo electrónico válido.");
  }

  if (!datos.calidad) {
    throw new Error("Seleccione la calidad (Propietario o Arrendatario).");
  }

  if (!datos.numeroParqueadero) {
    throw new Error("El número de parqueadero es obligatorio.");
  }

  if (!datos.tipoVehiculo) {
    throw new Error("Seleccione el tipo de vehículo.");
  }

  if (!datos.marcaLinea) {
    throw new Error("La marca y línea del vehículo son obligatorias.");
  }

  if (!datos.placa) {
    throw new Error("La placa del vehículo es obligatoria.");
  }

  if (!datos.tipoConector) {
    throw new Error("Seleccione el tipo de conector.");
  }

  if (!datos.anexoTarjetaPropiedad) {
    throw new Error("Adjunte la copia de la tarjeta de propiedad del vehículo.");
  }

  if (!datos.anexoSoat) {
    throw new Error("Adjunte la copia del SOAT.");
  }

  if (!datos.anexoTecnomecanica) {
    throw new Error("Adjunte la copia de la certificación tecnomecánica.");
  }

  if (!datos.anexoCertificacionElectrica) {
    throw new Error("Adjunte la certificación de instalación eléctrica / ficha técnica del cargador.");
  }

  if (!datos.anexoCertificacionRetie) {
    throw new Error("Adjunte la certificación RETIE del cargador.");
  }

  if (datos.calidad === "Arrendatario / Tenedor" && !datos.anexoCartaAutorizacion) {
    throw new Error("Al ser arrendatario, debe adjuntar la carta de autorización del propietario.");
  }

  if (!datos.anexoCompromisoReglamento) {
    throw new Error("Adjunte el compromiso firmado de cumplimiento del Reglamento Interno.");
  }

  if (!datos.nombreFirmante) {
    throw new Error("El nombre completo del firmante es obligatorio.");
  }

  if (!datos.cedulaFirmante) {
    throw new Error("La cédula / NIT del firmante es obligatoria.");
  }

  if (!datos.firma) {
    throw new Error("Falta la firma del solicitante.");
  }

  if (!datos.aceptaHabeasData) {
    throw new Error("Debe aceptar la cláusula de tratamiento de datos personales (Habeas Data).");
  }

  if (!datos.aceptaReglamento) {
    throw new Error("Debe aceptar la declaración de compromiso y el Reglamento Interno.");
  }

  return true;
}

//======================================================
// REGISTRAR SOLICITUD DE VEHÍCULO
//======================================================

function registrarVehiculo(datos) {
  try {
    validarSolicitud(datos);

    datos.apto = String(datos.apto).trim().toUpperCase();
    datos.placa = String(datos.placa).trim().toUpperCase();

    var existente = buscarVehiculoRegistrado(datos.placa);

    if (existente) {
      throw new Error(
        "La placa " + datos.placa + " ya está registrada para el apartamento " +
        existente.datos[3] + ". Si los datos cambiaron, contacte a la administración."
      );
    }

    var urlTarjetaPropiedad = subirAnexoDrive(datos.anexoTarjetaPropiedad, datos.apto, datos.placa, "TarjetaPropiedad");
    var urlSoat = subirAnexoDrive(datos.anexoSoat, datos.apto, datos.placa, "SOAT");
    var urlTecnomecanica = subirAnexoDrive(datos.anexoTecnomecanica, datos.apto, datos.placa, "Tecnomecanica");
    var urlCertificacionElectrica = subirAnexoDrive(datos.anexoCertificacionElectrica, datos.apto, datos.placa, "CertificacionElectrica");
    var urlCertificacionRetie = subirAnexoDrive(datos.anexoCertificacionRetie, datos.apto, datos.placa, "CertificacionRETIE");
    var urlCartaAutorizacion = subirAnexoDrive(datos.anexoCartaAutorizacion, datos.apto, datos.placa, "CartaAutorizacion");
    var urlCompromisoReglamento = subirAnexoDrive(datos.anexoCompromisoReglamento, datos.apto, datos.placa, "CompromisoReglamento");
    var urlFirma = subirAnexoDrive(datos.firma, datos.apto, datos.placa, "Firma");

    var hoja = obtenerHojaRegistro();

    hoja.appendRow([
      new Date(),
      datos.nombreTitular,
      datos.cedulaTitular,
      datos.apto,
      datos.telefono,
      datos.correo,
      datos.calidad,
      datos.numeroParqueadero,
      datos.ubicacion || "",
      datos.tipoVehiculo,
      datos.marcaLinea,
      datos.placa,
      datos.color || "",
      datos.capacidadBateria || "",
      datos.potenciaCarga || "",
      datos.tipoConector,
      urlTarjetaPropiedad,
      urlSoat,
      urlTecnomecanica,
      urlCertificacionElectrica,
      urlCertificacionRetie,
      urlCartaAutorizacion,
      urlCompromisoReglamento,
      datos.nombreFirmante,
      datos.cedulaFirmante,
      urlFirma,
      "Sí",
      "Sí"
    ]);

    return {
      success: true,
      mensaje: "Solicitud registrada correctamente."
    };

  } catch (error) {
    return {
      success: false,
      mensaje: error.message
    };
  }
}

//======================================================
// PRUEBA DE CONEXIÓN
//======================================================

function probarConexion() {
  return {
    estado: "OK",
    mensaje: "Conexión exitosa.",
    fecha: new Date()
  };
}
