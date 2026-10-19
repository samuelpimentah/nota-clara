import Fraction from 'fraction.js';
import Decimal from 'decimal.js';
export type ExactValue = Exact | number | string;
// Todas as decisões usam frações de inteiros (BigInt), inclusive médias periódicas.
// Conversão para número ocorre apenas para exibir/armazenar a recomendação final.
export default class Exact {
  private readonly value: Fraction;
  constructor(input: ExactValue | Fraction) {
    this.value = input instanceof Exact ? input.value : input instanceof Fraction ? input : new Fraction(new Decimal(input).toFixed());
  }
  plus(other: ExactValue) { return new Exact(this.value.add(new Exact(other).value)); }
  minus(other: ExactValue) { return new Exact(this.value.sub(new Exact(other).value)); }
  mul(other: ExactValue) { return new Exact(this.value.mul(new Exact(other).value)); }
  div(other: ExactValue) { return new Exact(this.value.div(new Exact(other).value)); }
  lt(other: ExactValue) { return this.value.compare(new Exact(other).value) < 0; }
  gt(other: ExactValue) { return this.value.compare(new Exact(other).value) > 0; }
  gte(other: ExactValue) { return this.value.compare(new Exact(other).value) >= 0; }
  isZero() { return this.value.n === 0n; }
  toNumber() { return this.value.valueOf(); }
  ceilHundredths() { return this.value.mul(100).ceil().div(100).valueOf(); }
  static min(a: ExactValue, b: ExactValue) { return new Exact(a).lt(b) ? new Exact(a) : new Exact(b); }
  static max(a: ExactValue, b: ExactValue) { return new Exact(a).gt(b) ? new Exact(a) : new Exact(b); }
}
