const mariadb = require("mariadb");
const {forEach, isArray, isObject, isUndefined, isNull} = require("lodash");
const {vsprintf, sprintf} = require("sprintf-js");

let options = {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "",
    prefix: "",
    connectionLimit: 10
};

module.exports = class DB {
    constructor(table) {
        this.options = options;

        this.table = table || "";
        this.columns = [];
        this.sort = [];
        this.limit = null;

        this.connection = mariadb.createPool({
            host: this.options.host,
            port: this.options.port,
            user: this.options.user,
            password: this.options.password,
            database: this.options.database,
            connectionLimit: this.options.connectionLimit,
        });
    }

    static setOptions(data) {
        options = Object.assign({}, options, data || {});
    }

    static setPrefix(prefix) {
        options = Object.assign(options, {
            prefix: prefix
        });
    }

    getTable() {
        return this.options.prefix + this.table;
    }

    setColumns(...arr) {
        if (isArray(arr[0]))
            arr = arr[0];

        this.columns = arr;
    }

    setLimit(limit) {
        this.limit = limit;
    }

    setSort(sort) {
        this.sort.push(sort);
    }

    _placeHoldersString(length) {
        let places = "";
        for (let i = 1; i <= length; i++) {
            places += "?, ";
        }
        return /(.*),/.exec(places)[1];
    }

    select(whereStatement, ...args) {
        return new Promise(function (resolve, reject) {
            if (whereStatement) {
                whereStatement = whereStatement.replace(/where/i, "");
            }

            let query = [];
            query.push(this.columns.length > 0 ? this.columns.join(", ") : "*");
            query.push(this.getTable());
            query.push(whereStatement ? "WHERE " + whereStatement : "");
            query.push(this.sort.length > 0 ? " ORDER BY " + this.sort.join(",") : "");
            query.push(this.limit ? "LIMIT " + this.limit : "");

            this.query(vsprintf("SELECT %s FROM %s %s %s %s", query), args).then(function (rows) {
                delete rows.meta;
                forEach(rows, function (item, index) {
                    let newItem = {};
                    forEach(Object.keys(item), function (key) {
                        try {
                            if (!isNull(newItem[key]))
                                newItem[key] = JSON.parse(item[key]);
                            else
                                newItem[key] = item[key];
                        } catch (e) {
                            newItem[key] = item[key];
                        }
                    }.bind(this));
                    rows[index] = newItem;
                }.bind(this));
                resolve(rows);
            }.bind(this)).catch(function (e) {
                reject(e);
            });
        }.bind(this));
    }

    insert(data) {
        let columns = [];
        let values = [];

        forEach(Object.keys(data), function (key) {
            let item = data[key];
            if (isArray(item) || isObject(item))
                item = JSON.stringify(item);
            if (isUndefined(item))
                item = null;

            columns.push(key);
            values.push(item);
        }.bind(this));

        return this.query(vsprintf(`INSERT INTO %s (%s) VALUES(${this._placeHoldersString(values.length)})`, [
            this.getTable(),
            columns.join(", ")
        ]), values);
    }

    update(data, whereStatement, ...args) {
        if (whereStatement) {
            whereStatement = whereStatement.replace(/where/i, "");
        }

        let columns = [];
        let values = [];
        forEach(Object.keys(data), function (key) {
            let item = data[key];
            if (isArray(item) || isObject(item))
                item = JSON.stringify(item);

            values.push(item);
            columns.push(sprintf("%s = ?", key));
        }.bind(this));

        let opts = values.concat(args);

        let query = [];
        query.push(this.getTable());
        query.push((columns ? columns.join(", ") : ""));
        query.push((whereStatement ? "WHERE " + whereStatement : ""));
        return this.query(vsprintf("UPDATE %s SET %s %s", query), opts);
    }

    delete(whereStatement, ...args) {
        if (whereStatement) {
            whereStatement = whereStatement.replace(/where/i, "");
        }

        let query = [];
        query.push(this.getTable());
        query.push(whereStatement ? "WHERE " + whereStatement : "");
        return this.query(vsprintf("DELETE FROM %s %s", query), args);
    }

    query(...query) {
        return new Promise(async function (resolve, reject) {
            this.connection.query(...query).then(async function (res) {
                resolve(res);
            }).catch(function (err) {
                reject(err);
            });
        }.bind(this));
    }

    close() {
        return new Promise(function (resolve) {
            this.connection.end().then(function () {
                resolve();
            });
        }.bind(this));
    }

};