import type {
  IVideoRepository,
  ListOptions,
  PagedVideos,
  TerminalTransition,
} from '../domain/ports/video-repository';
import { Video } from '../domain/video.entity';
import { VideoModel, type VideoDocument } from './video.model';

/** MongoDB implementation of {@link IVideoRepository}, backed by Mongoose. */
export class MongoVideoRepository implements IVideoRepository {
  async save(video: Video): Promise<void> {
    const s = video.toSnapshot();
    await VideoModel.updateOne(
      { _id: s.id },
      {
        $set: {
          ownerId: s.ownerId,
          prompt: s.prompt,
          durationSeconds: s.durationSeconds,
          status: s.status,
          jobRef: s.jobRef,
          resultUrl: s.resultUrl,
          error: s.error,
          updatedAt: s.updatedAt,
        },
        $setOnInsert: { createdAt: s.createdAt },
      },
      { upsert: true },
    ).exec();
  }

  async findById(id: string): Promise<Video | null> {
    const doc = await VideoModel.findById(id).lean<VideoDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByJobRef(jobRef: string): Promise<Video | null> {
    const doc = await VideoModel.findOne({ jobRef }).lean<VideoDocument>().exec();
    return doc ? this.toEntity(doc) : null;
  }

  async claimTerminal(jobRef: string, transition: TerminalTransition): Promise<Video | null> {
    const set =
      transition.status === 'ready'
        ? { status: 'ready', resultUrl: transition.resultUrl, updatedAt: new Date() }
        : { status: 'failed', error: transition.error, updatedAt: new Date() };

    // The `status: 'processing'` filter is the compare-and-set guard: only the
    // first caller flips the document; concurrent callers match nothing → null.
    const doc = await VideoModel.findOneAndUpdate(
      { jobRef, status: 'processing' },
      { $set: set },
      { new: true },
    )
      .lean<VideoDocument>()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByOwner(ownerId: string, options: ListOptions): Promise<PagedVideos> {
    const [docs, total] = await Promise.all([
      VideoModel.find({ ownerId })
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .lean<VideoDocument[]>()
        .exec(),
      VideoModel.countDocuments({ ownerId }).exec(),
    ]);

    return { items: docs.map((doc) => this.toEntity(doc)), total };
  }

  private toEntity(doc: VideoDocument): Video {
    return Video.fromSnapshot({
      id: doc._id,
      ownerId: doc.ownerId,
      prompt: doc.prompt,
      durationSeconds: doc.durationSeconds,
      status: doc.status,
      jobRef: doc.jobRef ?? null,
      resultUrl: doc.resultUrl ?? null,
      error: doc.error ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
