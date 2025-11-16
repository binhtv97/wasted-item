"use strict";
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
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var defaultOutlet, wasteItems, wasteReasons, testUser, _a, _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, prisma.outlet.create({
                        data: {
                            outletCode: "OUTLET001",
                            name: "Main Street Location",
                            address: "123 Main St, City",
                            timezone: "America/New_York",
                        },
                    })];
                case 1:
                    defaultOutlet = _e.sent();
                    console.log("Created default outlet:", defaultOutlet);
                    return [4 /*yield*/, prisma.wasteItem.createMany({
                            data: [
                                {
                                    itemCode: "BREAD",
                                    label: "Bread Rolls",
                                    unit: "pieces",
                                    icon: "🍞",
                                    color: "#D2691E",
                                    displayOrder: 1,
                                },
                                {
                                    itemCode: "MEAT",
                                    label: "Meat Patties",
                                    unit: "pieces",
                                    icon: "🥩",
                                    color: "#8B4513",
                                    displayOrder: 2,
                                },
                                {
                                    itemCode: "VEGETABLES",
                                    label: "Fresh Vegetables",
                                    unit: "kg",
                                    icon: "🥬",
                                    color: "#228B22",
                                    displayOrder: 3,
                                },
                                {
                                    itemCode: "FRIES",
                                    label: "French Fries",
                                    unit: "kg",
                                    icon: "🍟",
                                    color: "#FFD700",
                                    displayOrder: 4,
                                },
                                {
                                    itemCode: "BEVERAGES",
                                    label: "Beverages",
                                    unit: "liters",
                                    icon: "🥤",
                                    color: "#4169E1",
                                    displayOrder: 5,
                                },
                                {
                                    itemCode: "PACKAGING",
                                    label: "Packaging Materials",
                                    unit: "pieces",
                                    icon: "📦",
                                    color: "#696969",
                                    displayOrder: 6,
                                },
                            ],
                        })];
                case 2:
                    wasteItems = _e.sent();
                    console.log("Created default waste items");
                    return [4 /*yield*/, prisma.wasteReason.createMany({
                            data: [
                                {
                                    reasonCode: "EXPIRED",
                                    description: "Product expired",
                                    displayOrder: 1,
                                },
                                {
                                    reasonCode: "DAMAGED",
                                    description: "Product damaged",
                                    displayOrder: 2,
                                },
                                {
                                    reasonCode: "OVERPRODUCTION",
                                    description: "Overproduction",
                                    displayOrder: 3,
                                },
                                {
                                    reasonCode: "TEMPERATURE",
                                    description: "Temperature control issue",
                                    displayOrder: 4,
                                },
                                {
                                    reasonCode: "QUALITY",
                                    description: "Quality issue",
                                    displayOrder: 5,
                                },
                                {
                                    reasonCode: "OTHER",
                                    description: "Other reason",
                                    displayOrder: 6,
                                },
                            ],
                        })];
                case 3:
                    wasteReasons = _e.sent();
                    console.log("Created default waste reasons");
                    _b = (_a = prisma.user).create;
                    _c = {};
                    _d = {
                        email: "test@example.com",
                        username: "testuser"
                    };
                    return [4 /*yield*/, bcryptjs_1.default.hash("1234", 10)];
                case 4: return [4 /*yield*/, _b.apply(_a, [(_c.data = (_d.pinHash = _e.sent(),
                            _d.name = "Test User",
                            _d.outletId = defaultOutlet.id,
                            _d.role = "manager",
                            _d),
                            _c)])];
                case 5:
                    testUser = _e.sent();
                    console.log("Created test user:", testUser);
                    console.log("Seeding completed successfully!");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
