import type {
  IPublicationRepository,
  ListOptions,
  PagedPublications,
} from '../domain/ports/publication-repository';
import { Publication } from '../domain/publication.entity';
import { PublicationModel, type PublicationDocument } from './publication.model';

/** MongoDB implementation of {@link IPublicationRepository}. */
export class MongoPublicationRepository implements IPublicationRepository {
  async save(publication: Publication): Promise<void> {
    const s = publication.toSnapshot();
    await PublicationModel.updateOne(
      { _id: s.id },
      {
        $set: {
          userId: s.userId,
          videoId: s.videoId,
          caption: s.caption,
          scheduledAt: s.scheduledAt,
          status: s.status,
          targets: s.targets,
          updatedAt: s.updatedAt,
        },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true },
    ).exec();
  }

  async findById(id: string): Promise<Publication | null> {
    const doc = await PublicationModel.findById(id).lean<PublicationDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByOwner(ownerId: string, options: ListOptions): Promise<PagedPublications> {
    const [docs, total] = await Promise.all([
      PublicationModel.find({ userId: ownerId })
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean<PublicationDocument[]>()
        .exec(),
      PublicationModel.countDocuments({ userId: ownerId }).exec(),
    ]);
    return { items: docs.map((doc) => this.toEntity(doc)), total };
  }

  async findDue(now: Date, limit: number): Promise<Publication[]> {
    const docs = await PublicationModel.find({ status: 'scheduled', scheduledAt: { $lte: now } })
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .lean<PublicationDocument[]>()
      .exec();
    return docs.map((doc) => this.toEntity(doc));
  }

  private toEntity(doc: PublicationDocument): Publication {
    return Publication.fromSnapshot({
      id: doc._id,
      userId: doc.userId,
      videoId: doc.videoId,
      caption: doc.caption ?? null,
      scheduledAt: doc.scheduledAt ?? null,
      status: doc.status,
      targets: (doc.targets ?? []).map((t) => ({
        platform: t.platform,
        connectionId: t.connectionId,
        status: t.status,
        externalPostId: t.externalPostId ?? null,
        error: t.error ?? null,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
