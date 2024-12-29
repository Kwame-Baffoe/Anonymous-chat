"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.transaction = transaction;
var pg_1 = require("pg");
if (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_HOST || !process.env.POSTGRES_DB) {
    throw new Error('Please add PostgreSQL credentials to .env.local');
}
var pool = new pg_1.Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
    } : undefined,
    max: parseInt(process.env.POSTGRES_POOL_MAX || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
// Add error handler to the pool
pool.on('error', function (err) {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Add connect handler to verify connection
pool.connect(function (err, client, done) {
    if (err) {
        console.error('Error connecting to the database:', err);
    }
    else {
        console.log('Successfully connected to database');
        done();
    }
});
function query(text, params) {
    return __awaiter(this, void 0, void 0, function () {
        var retries, lastError, _loop_1, i, state_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    retries = 3;
                    _loop_1 = function (i) {
                        var client, result, error_1, delay_1;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    client = void 0;
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 4, 9, 10]);
                                    console.log('Attempting to establish database connection...');
                                    return [4 /*yield*/, pool.connect()];
                                case 2:
                                    client = _e.sent();
                                    console.log('Database connection established successfully');
                                    console.log('Executing query:', {
                                        text: text,
                                        params: params,
                                        attempt: i + 1,
                                        timestamp: new Date().toISOString()
                                    });
                                    return [4 /*yield*/, client.query(text, params)];
                                case 3:
                                    result = _e.sent();
                                    // Only log field info for SELECT queries
                                    if (result.fields) {
                                        console.log('Query result:', {
                                            rowCount: result.rowCount,
                                            fields: ((_a = result.fields) === null || _a === void 0 ? void 0 : _a.length) ? result.fields.map(function (f) { return f.name; }) : [],
                                            timestamp: new Date().toISOString()
                                        });
                                        if (((_b = result.rows) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                                            console.log('Sample row (first row):', __assign(__assign({}, result.rows[0]), { password: ((_c = result.rows[0]) === null || _c === void 0 ? void 0 : _c.password) ? '[REDACTED]' : undefined }));
                                        }
                                    }
                                    else {
                                        console.log('DDL Query executed successfully');
                                    }
                                    return [2 /*return*/, { value: result }];
                                case 4:
                                    error_1 = _e.sent();
                                    lastError = error_1;
                                    console.error("Database query error (attempt ".concat(i + 1, "):"), error_1);
                                    if (!(error_1 instanceof Error)) return [3 /*break*/, 8];
                                    if (!error_1.message.includes('connection')) return [3 /*break*/, 7];
                                    if (!(i < retries - 1)) return [3 /*break*/, 6];
                                    delay_1 = (i + 1) * 1000;
                                    console.log("Retrying in ".concat(delay_1, "ms..."));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 5:
                                    _e.sent();
                                    return [2 /*return*/, "continue"];
                                case 6: throw new Error('Database connection failed after multiple attempts. Please try again later.');
                                case 7: throw new Error("Database error: ".concat(error_1.message));
                                case 8: throw new Error('An unexpected database error occurred');
                                case 9:
                                    if (client) {
                                        console.log('Releasing database connection');
                                        client.release();
                                    }
                                    return [7 /*endfinally*/];
                                case 10: return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _d.label = 1;
                case 1:
                    if (!(i < retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(i)];
                case 2:
                    state_1 = _d.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _d.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: throw lastError;
            }
        });
    });
}
function transaction(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var client, retries, _loop_2, state_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    retries = 3;
                    _loop_2 = function () {
                        var result, error_2, delay_2;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 5, 10, 11]);
                                    return [4 /*yield*/, pool.connect()];
                                case 1:
                                    client = _b.sent();
                                    console.log('Transaction: Beginning database transaction');
                                    return [4 /*yield*/, client.query('BEGIN')];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, callback(client)];
                                case 3:
                                    result = _b.sent();
                                    return [4 /*yield*/, client.query('COMMIT')];
                                case 4:
                                    _b.sent();
                                    console.log('Transaction: Successfully committed');
                                    return [2 /*return*/, { value: result }];
                                case 5:
                                    error_2 = _b.sent();
                                    console.error('Transaction error:', error_2);
                                    if (!client) return [3 /*break*/, 7];
                                    console.log('Transaction: Rolling back due to error');
                                    return [4 /*yield*/, client.query('ROLLBACK')];
                                case 6:
                                    _b.sent();
                                    _b.label = 7;
                                case 7:
                                    retries--;
                                    if (!(retries > 0 && error_2 instanceof Error && error_2.message.includes('connection'))) return [3 /*break*/, 9];
                                    delay_2 = (3 - retries) * 1000;
                                    console.log("Retrying transaction in ".concat(delay_2, "ms..."));
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_2); })];
                                case 8:
                                    _b.sent();
                                    return [2 /*return*/, "continue"];
                                case 9:
                                    if (error_2 instanceof Error) {
                                        throw new Error("Transaction failed: ".concat(error_2.message));
                                    }
                                    throw new Error('Transaction failed: An unexpected error occurred');
                                case 10:
                                    if (client) {
                                        console.log('Transaction: Releasing database connection');
                                        client.release();
                                    }
                                    return [7 /*endfinally*/];
                                case 11: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!(retries > 0)) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_2()];
                case 2:
                    state_2 = _a.sent();
                    if (typeof state_2 === "object")
                        return [2 /*return*/, state_2.value];
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.default = pool;
