import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsIn(['ENSEIGNANT', 'SURVEILLANT'])
  role!: 'ENSEIGNANT' | 'SURVEILLANT';

  // Utilisé uniquement pour générer un identifiant lisible (prénom.nom) —
  // il n'existe pas de champ prénom/nom sur `User`, voir note du spec §5.1.
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
