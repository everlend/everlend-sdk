import { PublicKey } from '@solana/web3.js'
import { BinaryReader, BinaryWriter, deserialize, deserializeUnchecked, serialize } from 'src/base/borsh'

const extendBorsh = () => {
  ;(BinaryReader.prototype as any).readPublicKey = function () {
    const reader = this as unknown as BinaryReader
    const array = reader.readFixedArray(32)
    return new PublicKey(array)
  }
  ;(BinaryWriter.prototype as any).writePublicKey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter
    writer.writeFixedArray(value.toBuffer())
  }
}
extendBorsh()

type DataConstructor<T, A> = {
  readonly SCHEMA
  new (args: A): T
}

export class Data<T = {}> {
  constructor(args: T = {} as T) {
    Object.assign(this, args)
  }

  static struct<T, A>(this: DataConstructor<T, A>, fields: any) {
    return struct(this, fields)
  }

  static serialize<T, A>(this: DataConstructor<T, A>, args: A = {} as A) {
    return Buffer.from(serialize(this.SCHEMA, new this(args)))
  }

  static deserialize<T, A>(this: DataConstructor<T, A>, data: Buffer) {
    return deserializeUnchecked(this.SCHEMA, this, data)
  }
}

export const struct = <T>(type: any, fields: any) => {
  return new Map<any, any>([[type, { kind: 'struct', fields }]])
}

export { deserialize, deserializeUnchecked, serialize }
