#!/usr/bin/env python3
# adapted from https://github.com/nshepperd/gpt-2/blob/finetuning/src/interactive_conditional_samples.py

from flask import Flask, redirect, url_for, render_template, jsonify, send_from_directory, request, Response
import json
import re
import os
import random
import logging
import requests
import urllib
from flask import request, Response
from werkzeug.serving import run_simple
import traceback

# gpt-2 

import fire
import json
import os
import numpy as np
import tensorflow as tf
import model, sample, encoder

sess = None
enc = None
output = None
context = None
nsamples=1
batch_size=1

def make_graph():
    global sess
    global enc
    global output
    global context
    global nsamples
    global batch_size

    model_name='libby'
    model_dir='models'
    seed=None
    length=20
    temperature=1
    top_k=0
    top_p=0.0

    if batch_size is None:
        batch_size = 1
    assert nsamples % batch_size == 0

    enc = encoder.get_encoder(model_name, model_dir)
    hparams = model.default_hparams()
    with open(os.path.join(model_dir, model_name, 'hparams.json')) as f:
        hparams.override_from_dict(json.load(f))

    if length is None:
        length = hparams.n_ctx // 2
    elif length > hparams.n_ctx:
        raise ValueError("Can't get samples longer than window size: %s" % hparams.n_ctx)

    myGraph = tf.Graph()

    sess = tf.Session(graph=myGraph)
    with myGraph.as_default():
      context = tf.placeholder(tf.int32, [batch_size, None])
      np.random.seed(seed)
      tf.set_random_seed(seed)
      output = sample.sample_sequence(
            hparams=hparams, length=length,
            context=context,
            batch_size=batch_size,
            temperature=temperature, top_k=top_k, top_p=top_p
      )
      saver = tf.train.Saver()

      ckpt = tf.train.latest_checkpoint(os.path.join(model_dir, model_name))
      saver.restore(sess, ckpt)



## server

app = Flask(__name__)
app.debug = False

@app.route('/')
def real_libby():

  global sess
  global enc
  global output
  global context
  global nsamples
  global batch_size

  raw_text = request.args.get("text")
  result = ""
  try:
    context_tokens = enc.encode(raw_text)
    generated = 0
    for _ in range(nsamples // batch_size):
                out = sess.run(output, feed_dict={
                    context: [context_tokens for _ in range(batch_size)]
                })[:, len(context_tokens):]
                for i in range(batch_size):
                    generated += 1
                    text = enc.decode(out[i])
                    print("=" * 40 + " SAMPLE " + str(generated) + " " + "=" * 40)
                    print(text)
                    result = text


    print("ok")
  except Exception as e:
    print("Error!")
    print(str(e))
    tb = traceback.format_exc()
    print(tb)
  return result, 200, {'Content-Type': 'application/json; charset=utf-8'}


if __name__ == '__main__':
    make_graph()
    app.run(host='0.0.0.0', port=8080)
