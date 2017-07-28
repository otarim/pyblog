from pymongo import MongoClient

client = MongoClient('mongodb://pyblog:pyblog@127.0.0.1:27017/pyblog?authMechanism=SCRAM-SHA-1')
#client.admin.authenticate("pyblog","pyblog")
