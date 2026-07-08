function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  
  if (data.action === 'sync') {
    // Clear existing data (keep header)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 10).clear();
    }
    
    // Insert new data
    const rows = data.data.map(item => [
      item.id,
      item.code,
      item.name,
      item.category,
      item.stock,
      item.cost,
      item.price,
      item.location,
      item.notes,
      item.updatedAt
    ]);
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 10).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data synchronized'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: 'Unknown action'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  const data = sheet.getDataRange().getValues();
  
  // Convert to JSON (skip header)
  const items = [];
  for (let i = 1; i < data.length; i++) {
    items.push({
      id: data[i][0],
      code: data[i][1],
      name: data[i][2],
      category: data[i][3],
      stock: data[i][4],
      cost: data[i][5],
      price: data[i][6],
      location: data[i][7],
      notes: data[i][8],
      updatedAt: data[i][9]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(items))
    .setMimeType(ContentService.MimeType.JSON);
}