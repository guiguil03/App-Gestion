import { IsHexadecimal, Length } from 'class-validator';

export class RegisterSigningKeyDto {
  // Clé publique Ed25519, 32 octets encodés en hex.
  @IsHexadecimal()
  @Length(64, 64)
  publicKey!: string;
}
