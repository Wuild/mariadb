# WebSocket
This is a small and simple wrapper for mariadb in node

## Install
Install with npm:
```
npm install --save @wuild/mariadb
```

#### Example
```javascript
const DB = require("@wuild/mariadb");

DB.setOptions({
    host: "",
    user: "",
    password: "",
    database: ""
});

// Set table
let db = new DB("table_name");

// Insert data
db.insert({
    column: "data",
    column2: "other data"
}).then(function () {
    // Select data
    return db.select("column = ?", "data");
}).then(function () {
    // Update row
    return db.update({
        column: "change data"
    }, "column = ?", "data");
}).then(function(){
    // Delete row
    return db.delete("column = ?", "change data");
}).then(function(){
    // Run custom query
    return db.query("SELECT COUNT(column) as rows FROM table_name WHERE column = ?", "data")
}).then(function () {
    // Close connection
    return db.close()
}).catch(function (err) {
    db.close();
});
```

#### License
Copyright © 2018, Wuild. Released under the MIT License.