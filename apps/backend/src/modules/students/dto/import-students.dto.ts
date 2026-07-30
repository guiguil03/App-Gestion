import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';

// Même choix que ImportClassesDto : validation ligne par ligne faite dans
// StudentsService.importBulk pour pouvoir rapporter une erreur précise par
// ligne plutôt que de rejeter tout le fichier au premier champ invalide.
export class ImportStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  rows!: Record<string, string>[];
}
