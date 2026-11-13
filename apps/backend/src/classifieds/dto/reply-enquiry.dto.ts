import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyEnquiryDto {
  @IsString() @MinLength(2) @MaxLength(2000) reply!: string;
}
