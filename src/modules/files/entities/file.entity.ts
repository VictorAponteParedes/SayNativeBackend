import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FileType {
  AVATAR = 'AVATAR',
  CHAT_AUDIO = 'CHAT_AUDIO',
  CHAT_IMAGE = 'CHAT_IMAGE',
  SUPPORT_ATTACHMENT = 'SUPPORT_ATTACHMENT',
}

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'integer' })
  sizeBytes: number;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.AVATAR,
  })
  type: FileType;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
