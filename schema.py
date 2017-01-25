#!/usr/bin/env python3

import hashlib

from peewee import *

__all__ = [
    'Comment',
    'Member',
    'Status',
    'atomic',
    'comments',
    'initdb',
    'token',
]

DBPROXY = Proxy()

atomic = None

class BaseModel(Model):
    class Meta:
        database = DBPROXY

class Member(BaseModel):
    name = TextField()

class Status(BaseModel):
    author = ForeignKeyField(Member, related_name='statuses')
    created_at = DateTimeField()
    body = TextField()
    complete_link = TextField(null=True, default=None)
    # A space delimited list of image filenames (basenames, from which
    # we can construct the local and remote -- i.e., ww*.sinaimg.cn --
    # URLs).
    #
    # I know this is less than ideal, but I'm not going to give up on
    # the simplicity of SQLite on this and switch to
    # PostgresQL/MongoDB/etc. that requires a constantly running
    # service (as far as I know; not an expert on databases).
    #
    # Alternatively we can also have yet another table for images, but
    # that only leads to wasted blobs and cycles, as we won't be using
    # it for anything else.
    images = TextField()
    repost = BooleanField(default=False)
    orig_author = TextField(null=True, default=None)
    orig_body = TextField(null=True, default=None)
    orig_complete_link = TextField(null=True, default=None)
    # Again, a space delimited list of filenames.
    orig_images = TextField(default='')

class Comment(BaseModel):
    status = ForeignKeyField(Status, related_name='comments')
    commenter = ForeignKeyField(Member, related_name='comments')
    created_at = DateTimeField()
    body = TextField()
    image = TextField(null=True, default=None)

def initdb(path):
    global atomic
    db = SqliteDatabase(path)
    DBPROXY.initialize(db)
    db.connect()
    db.create_tables([Member, Status, Comment], safe=True)
    atomic = db.atomic

def token(status):
    h = hashlib.new('sha1')
    h.update(str(status.id).encode('utf-8'))
    return h.hexdigest()[:7]

def comments(status, prefetched=True):
    if prefetched:
        return list(status.comments_prefetch)
    else:
        return list(status.comments.order_by(Comment.created_at, Comment.id))
