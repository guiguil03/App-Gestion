import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

// Volontairement peu strict au niveau du DTO (pas de @ValidateNested par
// ligne) : une erreur sur une ligne du fichier importé ne doit pas faire
// échouer tout le lot avec un 400 générique — la validation fine et les
// messages d'erreur par ligne sont gérés dans ClassesService.importBulk.
export class ImportClassesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  rows!: Record<string, string>[];
}
