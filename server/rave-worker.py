#!/usr/bin/env python3
"""
RAVE GPU worker placeholder — extend with your RAVE model.
Reads length-prefixed PCM from stdin, writes transformed PCM to stdout.
"""
import struct
import sys

def main():
    while True:
        header = sys.stdin.buffer.read(4)
        if len(header) < 4:
            break
        (length,) = struct.unpack("<I", header)
        pcm = sys.stdin.buffer.read(length)
        if len(pcm) < length:
            break
        # TODO: load RAVE model, .to('cuda'), transform
        sys.stdout.buffer.write(struct.pack("<I", len(pcm)))
        sys.stdout.buffer.write(pcm)
        sys.stdout.buffer.flush()

if __name__ == "__main__":
    main()
