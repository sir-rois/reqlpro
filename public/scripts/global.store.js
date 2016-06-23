var ipcRenderer = window.nodeRequire('electron').ipcRenderer;
var RethinkDbService = window.nodeRequire('../main/services/rethinkdb.service');

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var jdenticon = require('jdenticon');
var Connection = require('../models/Connection');
var md5 = require('md5');
const _ = require('lodash');
const DateTypeService = require('../services/date-type.service.js');


var store = function(params) {
  EventEmitter.call(this); // Inherit constructor
  this.router = {
    ConnectionForm: {
      show: false,
      action: 'Add'
    },
    ConnectionActionMenu: {
      show: false
    },
    EntityForm: {
      show: false,
      action: 'Add',
      type: 'Database',
      toDeleteName: '',
      errMessage: '',
      formElems: {
        name: {
          valid: true,
          value: ''
        }
      }
    }
  };
  this.connection = params.connection || null;
  this.favorites = params.favorites || [];
  this.selectedFavorite = {
    databases: [],
    dbConnection: null
  };
  this.selectedTable = null;
};

util.inherits(store, EventEmitter); // Inherit eventemitter prototype

// Update selected favorite
store.prototype.updateSelectedFavorite = function(favorite) {
  var _this = this;
  _this.selectedFavorite = JSON.parse(JSON.stringify(favorite));
  _this.selectedFavorite.databases = [];
  _this.selectedTable = null;
  RethinkDbService.getConnection(favorite.host, favorite.port, favorite.authKey).then(function(conn) {
    _this.selectedFavorite.dbConnection = conn;
    RethinkDbService.getDbList(conn).then(function(dblist) {
      var databases = [];
      for (var i = 0; i < dblist.length; i++) {
        databases.push({
          name: dblist[i],
          tables: []
        });
      }
      _this.selectedFavorite.databases = databases;
      _this.emit('updateRehinkDbClient');
    }).catch(function(err) {
      _this.selectedFavorite.dbConnection = err;
      _this.emit('updateRehinkDbClient');
    });
  }).catch(function(err) {
    _this.selectedFavorite.dbConnection = err;
    _this.emit('updateRehinkDbClient');
  });
};

// Update CodeBody for Code view
store.prototype.updateCodeBody = function(body) {
  this.selectedTable.codeBody = body;
};

// Clear CodeBody error
store.prototype.clearCodeBodyError = function() {
  this.selectedTable.codeBodyError = null;
  this.emit('updateSelectedTable');
}


store.prototype.hideConnectionForm = function(info) {
  this.router.ConnectionForm.show = false;
  this.emit('hideConnectionForm');
};

// Toggle Connection Form
store.prototype.showConnectionForm = function(info) {
  this.connection = Connection.create();
  if (info) {
    // If we pass info lets set data on connection model
    this.connection.name.value = info.name;
    this.connection.port.value = info.port;
    this.connection.host.value = info.host;
    this.connection.database.value = info.database;
    this.connection.authKey.value = info.authKey;
    this.connection.identicon = info.identicon;
    this.connection.index = info.index;
    // Also set form action to edit
    this.router.ConnectionForm.action = 'Edit';
  } else {
    this.router.ConnectionForm.action = 'Add';
  }
  this.router.ConnectionForm.show = true;
  this.emit('showConnectionForm');
};

store.prototype.toggleConnectionActionMenu = function() {
  this.router.ConnectionActionMenu.show = !this.router.ConnectionActionMenu.show;
  this.emit('updateRehinkDbClient');
};

store.prototype.toggleEntityForm = function(type, action, toDeleteName) {
  this.router.EntityForm.show = !this.router.EntityForm.show;
  // If turning off EntityForm lets result defaults
  if(!this.router.EntityForm.show) {
    this.router.EntityForm = {
      show: false,
      action: 'Add',
      type: 'Database',
      toDeleteName: '',
      errMessage: '',
      formElems: {
        name: {
          valid: true,
          value: ''
        }
      }
    };
  } else {
    this.router.EntityForm.type = type;
    this.router.EntityForm.action = action;
    this.router.EntityForm.toDeleteName = toDeleteName;
  }
  this.emit('updateRehinkDbClient');
};

// Add favorite
store.prototype.addFavorite = function(favorite) {
  this.favorites.push({
    name: favorite.name.value,
    host: favorite.host.value,
    port: favorite.port.value,
    database: favorite.database.value,
    authKey: favorite.authKey.value,
    identicon: jdenticon.toSvg(md5(favorite.name.value), 40),
    index: this.favorites.length
  });
  this.emit('updateFavorites');
  ipcRenderer.send('writeConfigFile', {
    favorites: this.favorites
  });
};

// Edit favorite
store.prototype.editFavorite = function(favorite) {
  this.favorites[favorite.index] = {
    name: favorite.name.value,
    host: favorite.host.value,
    port: favorite.port.value,
    database: favorite.database.value,
    authKey: favorite.authKey.value,
    identicon: jdenticon.toSvg(md5(favorite.name.value), 40),
    index: favorite.index
  };
  // Lets run update selected favorite since thats what we are editing
  if (this.selectedFavorite.index === favorite.index) {
    this.updateSelectedFavorite(this.favorites[favorite.index]);
  }
  this.emit('updateFavorites');
  ipcRenderer.send('writeConfigFile', {
    favorites: this.favorites
  });
};

// Edit favorite
store.prototype.deleteFavorite = function(favorite) {
  this.favorites.splice(favorite.index, 1);
  // Lets update selected favorite since we just deleted our selected favorite
  if (this.selectedFavorite.index === favorite.index) {
    // If there are any favorites left lets do the first item in array
    if (this.favorites.length) {
      this.updateSelectedFavorite(this.favorites[0]);
    } else {
      // If no favorites lets set to default selectedFavorite object
      this.selectedFavorite = {
        databases: [],
        dbConnection: null
      };
      this.selectedTable = null;
    }
  }
  // We need to loop through and update the index field on all the favorites after a delete
  for (var i = 0; i < this.favorites.length; i++) {
    this.favorites[i].index = i;
  }
  this.emit('updateFavorites');
  ipcRenderer.send('writeConfigFile', {
    favorites: this.favorites
  });
};

// Show Tables
store.prototype.updateDbTables = function(database) {
  // Get table list from rethink service
  RethinkDbService.getTableList(this.selectedFavorite.dbConnection, database.name).then((tableList) => {
    // Wipe out previous tables
    database.tables = [];

    // Build up a table object and push to tables array on database
    for (var i = 0; i < tableList.length; i++) {
      database.tables.push({
        name: tableList[i]
      });
    }

    this.selectedDatabase = database;
    this.emit('updateRehinkDbClient');
  });
};

// Update Selected Table
store.prototype.updateSelectedTable = function(databaseName, tableName) {
  this.selectedTable = {
    databaseName: databaseName,
    name: tableName,
    type: this.selectedTable ? this.selectedTable.type !== 'code' ? this.selectedTable.type : 'table' : 'table',
    data: [],
    loading: true,
    codeBody: "{}",
    codeAction: 'add',
    codeBodyError: null,
    query: {
      page: 1,
      limit: this.selectedTable ? this.selectedTable.query.limit : 5,
      sort: 'id',
      direction: 1 // ASC = 1, DESC = 0
    }
  };
  this.emit('updateRehinkDbClient');
};

// Update Page Limit
store.prototype.updatePageLimit = function(limit) {
  this.selectedTable.query.limit = parseInt(limit);
  this.query();
};

// Update Table Sort
store.prototype.updateTableSort = function(sort) {
  if(sort === this.selectedTable.query.sort) {
    this.selectedTable.query.direction = !this.selectedTable.query.direction
  } else {
    this.selectedTable.query.direction = 1;
  }
  this.selectedTable.query.sort = sort;
  this.query();
};

// Get initial table data
store.prototype.query = function(queryParams = this.selectedTable.query) {
  this.selectedTable.query = queryParams;
  this.selectedTable.loading = true;
  this.emit('updateSelectedTable');
  console.log("QUERY this.selectedTable.query", this.selectedTable.query)
  if (queryParams.page) {
    this.getTableData(queryParams.sort, queryParams.direction, queryParams.limit, queryParams.page);
  } else if (queryParams.index) {
    this.getTableDataBetween(queryParams.index, queryParams.start, queryParams.end);
  }
};

// Get initial table data
store.prototype.getTableData = function(sort, direction, limit = 25, page = 1) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  if (page < 1) {
    page = 1;
  }

  RethinkDbService.getTableData(conn, db, table, sort, direction, limit, page).then((tableData) => {
    tableData.toArray().then((tableData) => {
      this.selectedTable.data = tableData;
      setTimeout(() => {
        this.selectedTable.loading = false;
        this.emit('updateSelectedTable');
      }, 200);
    }).catch(function(err) {
      console.error(err);
    });
  }).catch(function(err) {
    console.error(err);
  });
};

// Get initial table data
store.prototype.getTableDataBetween = function(index, start, end) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;
  RethinkDbService.getTableDataBetween(conn, db, table, index, start, end).then((tableData) => {
    tableData.toArray().then((tableData) => {
      if (end) {
        tableData.reverse();
      }
      console.log(tableData);
      this.selectedTable.data = tableData;
      setTimeout(() => {
        this.selectedTable.loading = false;
        this.emit('updateSelectedTable');
      }, 200);
    }).catch(function(err) {
      console.error(err);
    });
  }).catch(function(err) {
    console.error(err);
  });
};

// Get table size
store.prototype.getTableSize = function() {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  RethinkDbService.getTableSize(conn, db, table).then((tableSize) => {
    this.selectedTable.size = tableSize;
    this.emit('updateSelectedTable');
  }).catch(function(err) {
    console.error(err);
  });
};

// Insert row
store.prototype.insert = function(record) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  RethinkDbService.insert(conn, db, table, record).then((result) => {
    this.selectedTable.lastResult = result;
    console.log("--------> insert result", result)

    if (result.errors) {
      this.selectedTable.codeBodyError = result.first_error;
      this.emit('updateSelectedTable');
    } else {
      // Run last query to update view
      this.query();
      this.getTableSize();
      this.selectedTable.type = 'table';
    }
  }).catch((err) => {
    console.error("err", err)
    this.selectedTable.codeBodyError = err.first_error;
    // Run last query to update view
    this.query();
    console.error(err);
  });
};

// Switch to edit mode
store.prototype.startEdit = function(record) {
  this.selectedTable.codeAction = 'update';
  this.selectedTable.editingRecord = record;
  this.selectedTable.codeBody = JSON.stringify(record, null, '\t');
  this.selectedTable.type = 'code';
  this.emit('updateRehinkDbClient');
};

// Update row
store.prototype.update = function(record) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  RethinkDbService.update(conn, db, table, record).then((result) => {
    this.selectedTable.lastResult = result;
    console.log("--------> update result", result)

    if (result.errors) {
      this.selectedTable.codeBodyError = result.first_error;
      this.emit('updateSelectedTable');
    } else {
      // Run last query to update view
      this.query();
      this.selectedTable.type = 'table';
    }
  }).catch((err) => {
    console.error("err", err)
    this.selectedTable.codeBodyError = err.first_error;
    // Run last query to update view
    this.query();
    console.error(err);
  });
};

// Replace row
// The difference here is that it will create a new record if an id is not found
store.prototype.replace = function(record) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  RethinkDbService.replace(conn, db, table, record).then((result) => {
    this.selectedTable.lastResult = result;
    console.log("--------> replace result", result)

    if (result.errors) {
      this.selectedTable.codeBodyError = result.first_error;
      this.emit('updateSelectedTable');
    } else {
      // Run last query to update view
      this.query();
      this.selectedTable.type = 'table';
    }
  }).catch((err) => {
    console.error("err", err)
    this.selectedTable.codeBodyError = err.first_error;
    // Run last query to update view
    this.query();
    console.error(err);
  });
};

// Save Row from code view
store.prototype.saveRow = function(row) {
  try {
    row = JSON.parse(row);
    row = DateTypeService.convertStringsToDates(this.selectedTable.editingRecord, row);

    this.selectedTable.codeBodyError = null;
  } catch(e) {
    this.selectedTable.codeBodyError = 'You can only save valid json to your table';
    this.emit('updateSelectedTable');
    return;
  }
  if (this.selectedTable.codeAction === 'update') {
    if(row.length) {
      this.selectedTable.codeBodyError = 'Update expects a single item';
      this.emit('updateSelectedTable');
      return;
    }
    let matched = false;
    // Extra protection here if people alter the id when updating
    // Using replace will insert a new record
    // I'm assuming replace is less performant than update so lets use update when possible
    this.selectedTable.data.forEach(function(item, index) {
      if (item.id === row.id) {
        matched = true;
      }
    });
    if (matched) {
      this.update(row);
    } else {
      this.replace(row);
    }
  }
  if (this.selectedTable.codeAction === 'add') {
    this.insert(row);
  }
};

// Delete Row
store.prototype.deleteRow = function(row) {
  const conn = this.selectedFavorite.dbConnection;
  const db = this.selectedTable.databaseName;
  const table = this.selectedTable.name;

  RethinkDbService.delete(conn, db, table, row).then((result) => {
    this.selectedTable.lastResult = result;
    // Run last query to update view
    this.query();
    this.getTableSize();
    console.log("--------> replace result", result)
  }).catch((err) => {
    // Run last query to update view
    this.query();
    console.error(err);
  });
};

// Toggle Selected Table Type
store.prototype.toggleExplorerBody = function(type) {
  this.selectedTable.type = type;
  if (type === 'code') {
    this.selectedTable.codeAction = 'add';
    this.selectedTable.codeBody = "{}";
  }
  this.emit('updateRehinkDbClient');
};

// Refresh Explorer Body
store.prototype.refreshExplorerBody = function() {
  this.query();
};

// Save Database
store.prototype.saveDatabase = function(dbName) {
  const conn = this.selectedFavorite.dbConnection;
  return new Promise((resolve, reject) => {
    RethinkDbService.createDb(conn, dbName).then((results) => {
      // Add database to selectedfavorite list
      this.selectedFavorite.databases.push({
        name: dbName,
        tables: []
      });
      this.toggleEntityForm();
      resolve();
    }).catch((err) => {
      reject(err);
    });
  });
};

// Save Table
store.prototype.saveTable = function(tableName) {
  const conn = this.selectedFavorite.dbConnection;
  return new Promise((resolve, reject) => {
    RethinkDbService.createTable(conn, this.selectedDatabase.name, tableName, 'id').then((results) => {
      // Add table to selectedDatabase list
      this.selectedDatabase.tables.push({
        name: tableName
      });
      this.toggleEntityForm();
      resolve();
    }).catch((err) => {
      reject(err);
    });
  });
};

// Delete Database
store.prototype.deleteDatabase = function(dbName) {
  const conn = this.selectedFavorite.dbConnection;
  return new Promise((resolve, reject) => {
    RethinkDbService.deleteDb(conn, dbName).then((results) => {
      // Remove database from selectedfavorite list
      this.selectedFavorite.databases.forEach((db, index) => {
        if(db.name === dbName) {
          this.selectedFavorite.databases.splice(index, 1);
        }
      });
      this.toggleEntityForm();
      resolve();
    }).catch((err) => {
      reject(err);
    });
  });
};

// Delete Database
store.prototype.deleteTable = function(tableName) {
  const conn = this.selectedFavorite.dbConnection;
  return new Promise((resolve, reject) => {
    RethinkDbService.deleteTable(conn, this.selectedDatabase.name, tableName).then((results) => {
      // Remove database from selectedfavorite list
      this.selectedDatabase.tables.forEach((table, index) => {
        if(table.name === tableName) {
          this.selectedDatabase.tables.splice(index, 1);
        }
      });
      this.toggleEntityForm();
      resolve();
    }).catch((err) => {
      reject(err);
    });
  });
};

module.exports = store;
