import currency from "currency.js";


export function formatMoney(money: string | number, stripped_down: boolean = false) {
    const a = currency(Number(money));
    if (stripped_down) {
        return a.format({separator: '', symbol: ''});
    } else {
        return a.format();
    }
}