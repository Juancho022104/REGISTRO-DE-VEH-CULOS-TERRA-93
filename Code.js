/******************************************************
 * REGISTRO DE VEHÍCULOS - ZONA DE CARGADORES ELÉCTRICOS
 * EDIFICIO TERRA 93 PH
 *
 * ARCHIVO: Code.gs
 * Proyecto independiente del sistema de control de cargadores.
 * Guarda los vehículos autorizados a usar la zona de cargadores
 * eléctricos en una hoja propia de su propio Google Sheets.
 ******************************************************/

//======================================================
// CONFIGURACIÓN GENERAL
//======================================================

const ID_HOJA_CALCULO = "1bV3jXER5B6HTHEgm4J-DtFo59yHZNMjFpDo0wTBUi0Q";
const NOMBRE_HOJA = "Registro_Vehiculos_Cargadores";

const ENCABEZADOS_HOJA = [
  "Fecha Registro", "Apartamento", "Placa", "Tipo de Vehículo",
  "Marca", "Modelo", "Color", "Nombre Residente", "Cédula",
  "Teléfono", "Correo Residente", "Observaciones"
];

//======================================================
// CARGAR SISTEMA WEB
//======================================================

function doGet() {
  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Registro de Vehículos - Zona de Cargadores - Terra 93 PH")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

//======================================================
// INCLUIR HTML
//======================================================

function include(nombreArchivo) {
  return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
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
    if (String(datos[i][2]).trim().toUpperCase() === String(placa).trim().toUpperCase()) {
      return { fila: i + 1, datos: datos[i] };
    }
  }

  return null;
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
// VALIDAR DATOS DE REGISTRO DE VEHÍCULO
//======================================================

function validarVehiculo(datos) {
  if (!datos.apto) {
    throw new Error("El apartamento es obligatorio.");
  }

  if (!datos.placa) {
    throw new Error("La placa es obligatoria.");
  }

  if (!datos.tipoVehiculo) {
    throw new Error("El tipo de vehículo es obligatorio.");
  }

  if (!datos.nombre) {
    throw new Error("El nombre del residente es obligatorio.");
  }

  if (!datos.cedula) {
    throw new Error("La cédula del residente es obligatoria.");
  }

  if (!datos.telefono) {
    throw new Error("El teléfono del residente es obligatorio.");
  }

  if (!datos.correoResidente) {
    throw new Error("El correo del residente es obligatorio.");
  }

  if (!validarCorreo(datos.correoResidente)) {
    throw new Error("El correo del residente no es válido.");
  }

  return true;
}

//======================================================
// REGISTRAR VEHÍCULO AUTORIZADO PARA ZONA DE CARGA
//======================================================

function registrarVehiculo(datos) {
  try {
    validarVehiculo(datos);

    datos.apto = String(datos.apto).trim().toUpperCase();
    datos.placa = String(datos.placa).trim().toUpperCase();

    var existente = buscarVehiculoRegistrado(datos.placa);

    if (existente) {
      throw new Error(
        "La placa " + datos.placa + " ya está registrada para el apartamento " +
        existente.datos[1] + ". Si los datos cambiaron, contacte a la administración."
      );
    }

    var hoja = obtenerHojaRegistro();

    hoja.appendRow([
      new Date(),                    // Fecha Registro
      datos.apto,                    // Apartamento
      datos.placa,                   // Placa
      datos.tipoVehiculo,            // Tipo de Vehículo
      datos.marca || "",             // Marca
      datos.modelo || "",            // Modelo
      datos.color || "",             // Color
      datos.nombre,                  // Nombre Residente
      datos.cedula,                  // Cédula
      datos.telefono,                // Teléfono
      datos.correoResidente,         // Correo Residente
      datos.observaciones || ""      // Observaciones
    ]);

    return {
      success: true,
      mensaje: "Vehículo registrado correctamente."
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
