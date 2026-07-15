import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsOptional, Matches, ValidateNested } from 'class-validator';

import { GeoPointDto } from '@/modules/schools/dto/geo-point.dto';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateAttendanceSettingsDto {
  // Les 4 coins du périmètre, dans l'ordre — `null` explicite pour désactiver
  // la restriction de position sans en repasser par la validation de tableau.
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @Type(() => GeoPointDto)
  geofenceCorners?: GeoPointDto[] | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu : HH:mm' })
  scanWindowStart?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'Format attendu : HH:mm' })
  scanWindowEnd?: string | null;
}
